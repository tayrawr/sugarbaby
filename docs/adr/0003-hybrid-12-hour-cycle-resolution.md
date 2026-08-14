# Hybrid 12-Hour Cycle Resolution

Feline diabetes management measures blood glucose tests as relative offsets (`+1h` to `+11h`) from an insulin dose, but doses may be delayed or skipped. We decided to dynamically anchor cycle offsets to the nearest preceding dose event in the 12-hour window, while gracefully falling back to scheduled clock boundaries when no dose is logged. This provides clinical accuracy for vet exports while maintaining a simple clock-time interface for everyday users.
