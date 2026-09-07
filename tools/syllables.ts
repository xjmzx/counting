export /**
 * Roughly how many syllables a written form has: runs of vowels in whatever
 * latin text is available, which for these languages is the reading when the
 * script is not latin. It only has to be proportional, not right — it is a
 * denominator, and "seventy-eight" having four beats to "ten" having one is
 * the whole of what is being asked. Falls back to one so nothing divides by
 * zero, and to characters when there are no latin vowels to count at all.
 */
function syllables(form: string, reading: string | undefined): number {
  // `y` counts as a vowel in "twenty" and as a consonant in "jūyon", and what
  // separates them is whether a vowel follows: a glide before a vowel, a vowel
  // otherwise. Without this the romaji runs together — "juyon" becomes one
  // vowel group where it is plainly two beats — and every Japanese reading
  // with a y in it reads as half its length.
  const text = (reading ?? form).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/y(?=[aeiou])/g, "-");
  const groups = text.match(/[aeiouy]+/g);
  if (groups) return Math.max(1, groups.length);
  const letters = [...form].filter((c) => c.trim() !== "").length;
  return Math.max(1, letters);
}
