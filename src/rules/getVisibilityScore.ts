/**
 * Calculates a visibility score (0-1) for an element based on size, color prominence, opacity, and font weight.
 * Returns a continuous score, not just binary checks.
 * @param element - The HTMLElement to evaluate
 * @returns number - Visibility score between 0 and 1
 */
export function getVisibilityScore(element: HTMLElement | null): number {
  if (!element) return 0;

  let score = 0;
  const details: Record<string, number | string> = {};

  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);

  // 1. Size scoring: logarithmic scale
  const area = rect.width * rect.height;
  const sizeScore = Math.min(Math.log10(area + 1) / 30, 0.25);
  details.width = rect.width;
  details.height = rect.height;
  details.area = area;
  details.sizeScore = sizeScore;
  score += sizeScore;

  // 2. Padding score: buttons have padding, text doesn't (detect button styling)
  const paddingTop = parseFloat(styles.paddingTop) || 0;
  const paddingRight = parseFloat(styles.paddingRight) || 0;
  const totalPadding = paddingTop + paddingRight;
  const paddingScore = Math.min(totalPadding / 30, 0.15); // Buttons typically have 8-16px padding
  details.paddingTop = paddingTop;
  details.paddingRight = paddingRight;
  details.paddingScore = paddingScore;
  score += paddingScore;

  // 3. Box shadow score: buttons often have shadows for prominence
  const boxShadow = styles.boxShadow;
  let shadowScore = 0;
  if (boxShadow && boxShadow !== 'none') {
    shadowScore = 0.1;
  }
  details.boxShadow = boxShadow;
  details.shadowScore = shadowScore;
  score += shadowScore;

  // 4. Background color scoring
  const bgColor = styles.backgroundColor;
  let colorScore = 0;
  details.bgColor = bgColor;
  
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    const rgbMatch = bgColor.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      const r = parseInt(rgbMatch[0]);
      const g = parseInt(rgbMatch[1]);
      const b = parseInt(rgbMatch[2]);
      
      details.r = r;
      details.g = g;
      details.b = b;
      
      const brightness = (r + g + b) / 3;
      details.brightness = brightness;
      
      // Score based on how distinct the color is from neutral
      // Very light (>220) or very dark (<30) get lower scores
      // Mid-range colors (saturated) get higher scores
      if (brightness > 220 || brightness < 20) {
        colorScore = 0.1; // Neutral/extreme colors
      } else {
        colorScore = 0.2; // Distinct colored background
      }
    }
  }
  details.colorScore = colorScore;
  score += colorScore;

  // 5. Opacity
  const opacity = parseFloat(styles.opacity);
  const opacityScore = opacity * 0.15;
  details.opacity = opacity;
  details.opacityScore = opacityScore;
  score += opacityScore;

  // 6. Font weight
  const fontWeight = parseInt(styles.fontWeight) || 400;
  const fontWeightScore = Math.min((fontWeight - 300) / 700, 0.1);
  details.fontWeight = fontWeight;
  details.fontWeightScore = fontWeightScore;
  score += fontWeightScore;

  // Log detailed breakdown
  console.log(`Visibility score for "${element.textContent?.slice(0, 20)}"`, {
    total: Math.min(score, 1),
    ...details
  });

  return Math.min(score, 1);
}