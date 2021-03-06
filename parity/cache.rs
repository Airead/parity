// Copyright 2015, 2016 Ethcore (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

use std::cmp::max;

const MIN_BC_CACHE_MB: u32 = 4;
const MIN_DB_CACHE_MB: u32 = 2;
const MIN_BLOCK_QUEUE_SIZE_LIMIT_MB: u32 = 16;
const DEFAULT_BLOCK_QUEUE_SIZE_LIMIT_MB: u32 = 50;
const DEFAULT_TRACE_CACHE_SIZE: u32 = 20;

/// Configuration for application cache sizes.
/// All	values are represented in MB.
#[derive(Debug, PartialEq)]
pub struct CacheConfig {
	/// Size of database cache set using option `set_block_cache_size_mb`
	/// 50% is blockchain
	/// 25% is tracing
	/// 25% is state
	db: u32,
	/// Size of blockchain cache.
	blockchain: u32,
	/// Size of transaction queue cache.
	queue: u32,
	/// Size of traces cache.
	traces: u32,
}

impl Default for CacheConfig {
	fn default() -> Self {
		CacheConfig::new(64, 8, DEFAULT_BLOCK_QUEUE_SIZE_LIMIT_MB)
	}
}

impl CacheConfig {
	/// Creates new cache config with cumulative size equal `total`.
	pub fn new_with_total_cache_size(total: u32) -> Self {
		CacheConfig {
			db: total * 7 / 8,
			blockchain: total / 8,
			queue: DEFAULT_BLOCK_QUEUE_SIZE_LIMIT_MB,
			traces: DEFAULT_TRACE_CACHE_SIZE,
		}
	}

	/// Creates new cache config with gitven details.
	pub fn new(db: u32, blockchain: u32, queue: u32) -> Self {
		CacheConfig {
			db: db,
			blockchain: blockchain,
			queue: queue,
			traces: DEFAULT_TRACE_CACHE_SIZE,
		}
	}

	/// Size of db cache for blockchain.
	pub fn db_blockchain_cache_size(&self) -> u32 {
		max(MIN_DB_CACHE_MB, self.blockchain / 4)
	}

	/// Size of db cache for state.
	pub fn db_state_cache_size(&self) -> u32 {
		max(MIN_DB_CACHE_MB, self.db * 3 / 4)
	}

	/// Size of block queue size limit
	pub fn queue(&self) -> u32 {
		max(self.queue, MIN_BLOCK_QUEUE_SIZE_LIMIT_MB)
	}

	/// Size of the blockchain cache.
	pub fn blockchain(&self) -> u32 {
		max(self.blockchain, MIN_BC_CACHE_MB)
	}

	/// Size of the traces cache.
	pub fn traces(&self) -> u32 {
		self.traces
	}
}

#[cfg(test)]
mod tests {
	use super::CacheConfig;

	#[test]
	fn test_cache_config_constructor() {
		let config = CacheConfig::new_with_total_cache_size(200);
		assert_eq!(config.db, 175);
		assert_eq!(config.blockchain(), 25);
		assert_eq!(config.queue(), 50);
	}

	#[test]
	fn test_cache_config_db_cache_sizes() {
		let config = CacheConfig::new_with_total_cache_size(400);
		assert_eq!(config.db, 350);
		assert_eq!(config.db_blockchain_cache_size(), 12);
		assert_eq!(config.db_state_cache_size(), 262);
	}

	#[test]
	fn test_cache_config_default() {
		assert_eq!(CacheConfig::default(), CacheConfig::new(64, 8, super::DEFAULT_BLOCK_QUEUE_SIZE_LIMIT_MB));
	}
}
