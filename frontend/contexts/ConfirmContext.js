// frontend/contexts/ConfirmContext.js
// Confirmation dialog context for global confirmation management
// Provides confirmation dialog functionality to all components
'use client';

import { createContext } from 'react';

const ConfirmContext = createContext(null);

export default ConfirmContext;