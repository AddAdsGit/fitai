// Utility: Check if a meal/recipe image is ungenerated / uses fallback placeholder
export const hasNoGeneratedImage = (imagePath?: string): boolean => {
  if (!imagePath) return true;
  return imagePath.includes("photo-1546069901-ba9599a7e63c");
};

// Utility: format a Date object to YYYY-MM-DD string
export const formatDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Utility: copy text to clipboard with a toast label
export const copyToClipboard = async (text: string, label = "Text") => {
  try {
    await navigator.clipboard.writeText(text);
    return `✅ ${label} copied!`;
  } catch {
    return `❌ Failed to copy ${label}`;
  }
};
