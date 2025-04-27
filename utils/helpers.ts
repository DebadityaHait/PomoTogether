/**
 * Generates a random 3-letter session code
 */
export const generateSessionCode = (): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Avoiding confusing characters like 0/O and 1/I
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Formats seconds into MM:SS display
 */
export const formatTime = (seconds: number): string => {
  // Handle invalid input
  if (isNaN(seconds) || seconds === undefined || seconds === null) {
    return '00:00';
  }
  
  // Ensure seconds is a non-negative integer
  const validSeconds = Math.max(0, Math.floor(seconds));
  
  const minutes = Math.floor(validSeconds / 60);
  const remainingSeconds = validSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Returns the appropriate color based on the timer phase
 */
export const getPhaseColor = (phase: 'work' | 'break' | 'longBreak'): string => {
  switch (phase) {
    case 'work':
      return '#FF5D73'; // Warm red for work
    case 'break':
      return '#4ECDC4'; // Teal for short break
    case 'longBreak':
      return '#6E44FF'; // Purple for long break
    default:
      return '#FF5D73';
  }
};

/**
 * Formats date to relative time (e.g. "2 min ago")
 */
export const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  }
  
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hr ago`;
  }
  
  const days = Math.floor(diffInSeconds / 86400);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}; 