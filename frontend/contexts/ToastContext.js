// frontend/contexts/ToastContext.js
// Toast notification context for global toast management
// Provides toast state and actions to all components
'use client';

import { createContext } from 'react';

const ToastContext = createContext(null);

export default ToastContext;