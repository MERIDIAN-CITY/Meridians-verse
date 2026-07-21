#![no_std]

//! Shared contracts library with common reusable primitives.

pub mod random;
pub mod insurance_types;
pub mod errors;

pub use random::Randomness;
pub use insurance_types::*;
pub use errors::*;
