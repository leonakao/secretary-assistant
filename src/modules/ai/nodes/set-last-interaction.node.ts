export const createSetLastInteractionNode = () => {
  return async () => {
    return {
      lastInteraction: new Date(),
    };
  };
};
