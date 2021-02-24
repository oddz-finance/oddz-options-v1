export const OptionType = {
  Call: 0,
  Put: 1,
};

export const AssetIds = {
  ETH: 0,
  BTC: 1,
  USDT: 2,
};

export const ExcerciseType = {
  Cash: 0,
  Physical: 1,
};

export const addDaysAndGetSeconds = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return Date.parse(date.toISOString().slice(0, 10)) / 1000;
};

export const getExpiry = (days = 1) => {
  return 60 * 60 * 24 * days;
};