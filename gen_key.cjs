const fs = require('fs');
const emotions = {
  Anger: ['anger', 'angry', 'rage', 'fury', 'furious', 'mad', 'hate', 'hostil', 'bitter', 'outrage'],
  Enraged: ['enrag', 'seethe', 'boil'],
  Jealous: ['jealous', 'envy'],
  Resentful: ['resent', 'spite', 'grudge'],
  Exasperated: ['exasperat', 'weary'],
  Irritable: ['irritab', 'cranky'],
  Annoyed: ['annoy', 'bother', 'pest'],
  Aggravated: ['aggravat', 'frustrat'],
  Disgust: ['disgust', 'sick', 'gross', 'foul', 'distaste', 'cringe'],
  Revolted: ['revolt', 'revulsion', 'appall'],
  Disappointed: ['disappoint', 'let down', 'dismay'],
  Nauseated: ['nauseat', 'queasy', 'gag'],
  Disapproving: ['disapprov', 'frown', 'judge'],
  Contemptuous: ['contempt', 'loath'],
  Disrespectful: ['disrespect', 'mock'],
  Scornful: ['scorn', 'sneer'],
  Fear: ['fear', 'afraid', 'scared', 'threat', 'danger'],
  Terrified: ['terrifi', 'fright', 'petrifi'],
  Panicked: ['panic', 'frantic'],
  Horrified: ['horrif', 'horror'],
  Insecure: ['insecure', 'doubt', 'unsure'],
  Nervous: ['nervous', 'trembl', 'shak', 'jitter'],
  Anxious: ['anxious', 'tension', 'stress'],
  Worried: ['worried', 'worry'],
  Happiness: ['happ', 'joy', 'smile', 'laugh', 'glad', 'peace', 'warm', 'bliss'],
  Content: ['content', 'satis', 'peaceful'],
  Elated: ['elat', 'euphori', 'fly'],
  Proud: ['proud', 'pride', 'honor'],
  Excited: ['excit', 'thrill', 'pump'],
  Cheerful: ['cheerful', 'cheer', 'bright'],
  Playful: ['playful', 'fun', 'joke'],
  Optimistic: ['optimistic', 'hopeful', 'bright'],
  Nostalgic: ['nostalgi', 'memory', 'past', 'reminisc'],
  Surprise: ['surpris', 'sudden', 'unexpected', 'what'],
  Startled: ['startle', 'jump', 'jolt'],
  Amazed: ['amaz', 'astound', 'wonder'],
  Stunned: ['stun', 'dumbfound', 'speechless'],
  Moved: ['moved', 'touch'],
  Confused: ['confus', 'baffle'],
  Disillusioned: ['disillusion', 'cynical'],
  Perplexed: ['perplex', 'puzzle'],
  Sadness: ['sad', 'sadness', 'cry', 'tear', 'weep', 'sorrow', 'loss', 'lost', 'gloom'],
  Hurt: ['hurt', 'pain', 'ache', 'wound'],
  Mournful: ['mourn', 'grief', 'tragic'],
  Depressed: ['depress', 'despair', 'heavy'],
  Lonely: ['lonely', 'alone', 'isolat'],
  Ashamed: ['ashamed', 'shame', 'embarrass'],
  Guilty: ['guilt', 'fault', 'blame'],
  Regretful: ['regret', 'wish']
};

let out = 'const KEYWORDS: KeywordMap = {\n';
for (const [k, arr] of Object.entries(emotions)) {
  out += `  ${k}: [\n`;
  out += `    ` + arr.map(w => `['${w}', ${Math.floor(Math.random() * 2) + 2}]`).join(', ') + `\n`;
  out += `  ],\n`;
}
out += '}\n';
fs.writeFileSync('C:\\Users\\ishan\\OneDrive\\Desktop\\test_folder\\neww\\chromawrite-v6\\chromawrite-v7\\tmp_key.txt', out);
