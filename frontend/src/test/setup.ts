import '@testing-library/jest-dom';

// Mock localStorage for tests
const localStorageMock = {
  getItem: (key: string) => {
    return null;
  },
  setItem: (key: string, value: string) => {
    // no-op
  },
  removeItem: (key: string) => {
    // no-op
  },
  clear: () => {
    // no-op
  },
};

global.localStorage = localStorageMock as Storage;
