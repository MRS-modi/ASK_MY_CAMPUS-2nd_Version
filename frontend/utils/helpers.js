function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function truncateText(text, length = 120) {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}