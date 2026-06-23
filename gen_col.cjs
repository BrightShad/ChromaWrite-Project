const fs = require('fs');
const emotions = [
  { p: 'Anger', subs: ['Enraged', 'Jealous', 'Resentful', 'Exasperated', 'Irritable', 'Annoyed', 'Aggravated'], base: [5, 70, 45], accent: [0, 65, 40] },
  { p: 'Disgust', subs: ['Revolted', 'Disappointed', 'Nauseated', 'Disapproving', 'Contemptuous', 'Disrespectful', 'Scornful'], base: [90, 30, 45], accent: [85, 25, 40] },
  { p: 'Fear', subs: ['Terrified', 'Panicked', 'Horrified', 'Insecure', 'Nervous', 'Anxious', 'Worried'], base: [270, 30, 35], accent: [260, 25, 30] },
  { p: 'Happiness', subs: ['Content', 'Elated', 'Proud', 'Excited', 'Cheerful', 'Playful', 'Optimistic', 'Nostalgic'], base: [45, 85, 55], accent: [35, 80, 50] },
  { p: 'Surprise', subs: ['Startled', 'Amazed', 'Stunned', 'Moved', 'Confused', 'Disillusioned', 'Perplexed'], base: [174, 65, 45], accent: [165, 60, 40] },
  { p: 'Sadness', subs: ['Hurt', 'Mournful', 'Depressed', 'Lonely', 'Ashamed', 'Guilty', 'Regretful'], base: [220, 40, 35], accent: [210, 35, 30] }
];

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

let out = 'export const COLOUR_DICTIONARY: Record<PrimaryEmotion, EmotionColourEntry> = {\n';

emotions.forEach(group => {
  out += `  // --- ${group.p} Family ---\n`;
  out += `  ${group.p.padEnd(16)}: entry('${hslToHex(...group.base)}', '${hslToHex(...group.accent)}', 4000, '${group.p}'),\n`;
  group.subs.forEach((sub, i) => {
    let [h, s, l] = group.base;
    let newH = (h + (i % 2 === 0 ? 5 : -5) * (i+1)) % 360;
    if (newH < 0) newH += 360;
    let newS = Math.min(100, s + (i % 3 === 0 ? 10 : -10));
    let newL = Math.max(10, Math.min(90, l + (i % 2 === 0 ? 5 : -5)));
    
    let [ah, as, al] = group.accent;
    let anewH = (ah + (i % 2 === 0 ? 5 : -5) * (i+1)) % 360;
    if (anewH < 0) anewH += 360;
    
    out += `  ${sub.padEnd(16)}: entry('${hslToHex(newH, newS, newL)}', '${hslToHex(anewH, as, al)}', ${4000 + i*500}, '${sub}'),\n`;
  });
});

out += '}\n';
fs.writeFileSync('C:\\Users\\ishan\\OneDrive\\Desktop\\test_folder\\neww\\chromawrite-v6\\chromawrite-v7\\tmp_col.js', out);
