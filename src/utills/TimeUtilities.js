// Default timezone constant
export const DEFAULT_TIMEZONE = 'UTC';

// Time utility functions
export const formatTime = (date, timezone = DEFAULT_TIMEZONE) => {
  return new Date(date).toLocaleString('en-US', {
    timeZone: timezone,
  });
};

export const getCurrentTime = (timezone = DEFAULT_TIMEZONE) => {
  return new Date().toLocaleString('en-US', {
    timeZone: timezone,
  });
};



