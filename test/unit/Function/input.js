// @flow
export const fn = (arg: string): Promise<void> =>
  new Promise(resolve =>
    setTimeout(() => {
      wrapper.update();
      resolve();
    }, 0)
  );