function normalizeUuid(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

function getCharCodes(value) {
  return Array.from(String(value == null ? '' : value)).map(function(ch) {
    return ch.charCodeAt(0);
  });
}

function findHiddenChars(value) {
  var matches = [];
  var source = String(value == null ? '' : value);
  for (var i = 0; i < source.length; ++i) {
    var code = source.charCodeAt(i);
    if (code <= 32 || code === 127 || code === 160) {
      matches.push({ index: i, code: code });
    }
  }
  return matches;
}

const uuidA = '93e60e00-bcb6-45b0-865f-197c369b9661';
const uuidB = '93e60e00-bcb6-45b0-865f-197c369b9661';

const rawEqual = String(uuidA) === String(uuidB);
const normalizedEqual = normalizeUuid(uuidA) === normalizeUuid(uuidB);

console.log('UUID A:', uuidA);
console.log('UUID B:', uuidB);
console.log('Равны как есть:', rawEqual ? 'ДА' : 'НЕТ');
console.log('Равны после normalize:', normalizedEqual ? 'ДА' : 'НЕТ');
console.log('Скрытые символы A:', JSON.stringify(findHiddenChars(uuidA)));
console.log('Скрытые символы B:', JSON.stringify(findHiddenChars(uuidB)));
console.log('Коды символов A:', JSON.stringify(getCharCodes(uuidA)));
console.log('Коды символов B:', JSON.stringify(getCharCodes(uuidB)));
