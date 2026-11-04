export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

