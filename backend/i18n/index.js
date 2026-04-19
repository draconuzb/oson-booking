const uz = require('./uz.json');
const ru = require('./ru.json');
const kz = require('./kz.json');
const uz_cyrl = require('./uz_cyrl.json');

const langs = { uz, ru, kz, uz_cyrl };

function t(lang, key, params = {}) {
  const text = langs[lang]?.[key] || langs.uz[key] || key;
  return text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

function getName(obj, lang) {
  const field = `name_${lang}`;
  return obj[field] || obj.name_uz || '';
}

function getBio(obj, lang) {
  const field = `bio_${lang}`;
  return obj[field] || obj.bio_uz || '';
}

module.exports = { t, getName, getBio };
