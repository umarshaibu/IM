import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';

/**
 * Format a timestamp for message display
 * Shows time if today, day name if this week, date otherwise
 */
export const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);

  if (isToday(date)) {
    return format(date, 'HH:mm');
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  if (isThisWeek(date)) {
    return format(date, 'EEEE'); // Day name
  }

  if (isThisYear(date)) {
    return format(date, 'MMM d');
  }

  return format(date, 'MMM d, yyyy');
};

/**
 * Format a timestamp for chat list display
 * Similar to WhatsApp's conversation list
 */
export const formatChatListTime = (dateString: string): string => {
  const date = new Date(dateString);

  if (isToday(date)) {
    return format(date, 'HH:mm');
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  if (isThisWeek(date)) {
    return format(date, 'EEE'); // Short day name
  }

  return format(date, 'dd/MM/yy');
};

/**
 * Format last seen time
 */
export const formatLastSeen = (dateString?: string): string => {
  if (!dateString) return 'last seen recently';

  const date = new Date(dateString);
  const now = new Date();
  const diffMins = differenceInMinutes(now, date);
  const diffHours = differenceInHours(now, date);
  const diffDays = differenceInDays(now, date);

  if (diffMins < 1) {
    return 'online';
  }

  if (diffMins < 60) {
    return `last seen ${diffMins} min ago`;
  }

  if (diffHours < 24) {
    return `last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }

  if (isYesterday(date)) {
    return `last seen yesterday at ${format(date, 'HH:mm')}`;
  }

  if (diffDays < 7) {
    return `last seen ${format(date, 'EEEE')} at ${format(date, 'HH:mm')}`;
  }

  return `last seen ${format(date, 'MMM d')} at ${format(date, 'HH:mm')}`;
};

/**
 * Format call duration
 */
export const formatCallDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format audio/video duration in minutes:seconds
 */
export const formatMediaDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (dateString: string): string => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};

/**
 * Format date for status viewer
 */
export const formatStatusTime = (dateString: string): string => {
  const date = new Date(dateString);

  if (isToday(date)) {
    return `Today, ${format(date, 'HH:mm')}`;
  }

  if (isYesterday(date)) {
    return `Yesterday, ${format(date, 'HH:mm')}`;
  }

  return format(date, 'MMM d, HH:mm');
};

/**
 * Get date separator text for message groups
 */
export const getDateSeparatorText = (dateString: string): string => {
  const date = new Date(dateString);

  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  if (isThisWeek(date)) {
    return format(date, 'EEEE');
  }

  if (isThisYear(date)) {
    return format(date, 'MMMM d');
  }

  return format(date, 'MMMM d, yyyy');
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};
