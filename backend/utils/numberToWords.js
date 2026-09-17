/**
 * Convert number to Indian Currency Words
 * e.g. 15420 -> "Rupees Fifteen Thousand Four Hundred and Twenty Only"
 */

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertBelowThousand(num) {
  let str = "";
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + " Hundred ";
    num %= 100;
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + " ";
    num %= 10;
  }
  if (num > 0) {
    str += ones[num] + " ";
  }
  return str.trim();
}

function numberToWords(amount) {
  if (!amount || isNaN(amount) || amount === 0) return "Zero Rupees Only";

  const num   = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - num) * 100);

  let crore        = Math.floor(num / 10000000);
  let remainder    = num % 10000000;
  let lakh         = Math.floor(remainder / 100000);
  remainder        = remainder % 100000;
  let thousand     = Math.floor(remainder / 1000);
  let belowThousand = remainder % 1000;

  let words = "";

  if (crore > 0)        words += convertBelowThousand(crore)        + " Crore ";
  if (lakh > 0)         words += convertBelowThousand(lakh)         + " Lakh ";
  if (thousand > 0)     words += convertBelowThousand(thousand)     + " Thousand ";
  if (belowThousand > 0) words += convertBelowThousand(belowThousand) + " ";

  words = words.trim();
  let result = "Rupees " + words;

  if (paise > 0) {
    result += " and " + convertBelowThousand(paise) + " Paise";
  }

  return result + " Only";
}

module.exports = numberToWords;
