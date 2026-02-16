// Words that stay lowercase in Title Case (unless first word)
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "if", "in",
  "is", "it", "no", "nor", "not", "of", "on", "or", "so", "the",
  "to", "up", "vs", "yet",
]);

/**
 * Title Case a string: capitalize first letter of each word,
 * except minor words (unless they are the first word).
 * Preserves text inside parentheses as-is.
 */
export function toTitleCase(str: string): string {
  if (!str) return str;

  // Split on parentheses — keep parens content as-is
  const parts = str.split(/(\([^)]*\))/);

  return parts
    .map((part) => {
      // If it's a parenthetical, leave it alone
      if (part.startsWith("(")) return part;

      return part
        .split(" ")
        .map((word, i) => {
          if (!word) return word;
          const lower = word.toLowerCase();
          // Always capitalize first word; skip minor words otherwise
          if (i > 0 && MINOR_WORDS.has(lower)) return lower;
          // Handle slash-separated words like "Tub/Shower"
          if (word.includes("/")) {
            return word
              .split("/")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join("/");
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
    })
    .join("");
}
