// Дрібні спільні утиліти (екранування HTML тощо).

// ================================================================
// HELPERS
// ================================================================
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Скорочення довгих назв жанрів лише для відображення (у базі й фільтрах лишається повна назва).
function abbrGenre(name){return String(name).replace(/alternative/gi,'alt');}
