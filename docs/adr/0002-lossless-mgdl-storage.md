# Lossless mg/dL Internal Storage

Users require seamless toggling between US standard (mg/dL) and International (mmol/L) units without losing precision. We decided to store all blood glucose readings internally as integer mg/dL values and perform deterministic reactive conversion (`value / 18.0182`) strictly in presentation layers. This eliminates floating-point rounding errors and database migration complexity when switching display preferences.
