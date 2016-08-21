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

//! DB backend wrapper for Account trie
use util::*;

static NULL_RLP_STATIC: [u8; 1] = [0x80; 1];

// combines a key with an address hash to ensure uniqueness.
// leaves the first 96 bits untouched in order to support partial key lookup.
#[inline]
fn combine_key<'a>(address_hash: &'a H256, key: &'a H256) -> H256 {
	let mut dst = key.clone();
	{
		let last_src: &[u8] = &*address_hash;
		let last_dst: &mut [u8] = &mut *dst;
		for (k, a) in last_dst[12..].iter_mut().zip(&last_src[12..]) {
			*k ^= *a
		}
	}

	dst
}

// TODO: introduce HashDBMut?
/// DB backend wrapper for Account trie
/// Transforms trie node keys for the database
pub struct AccountDB<'db> {
	db: &'db HashDB,
	address_hash: H256,
}

impl<'db> AccountDB<'db> {
	/// Create a new AccountDB from an address.
	pub fn new(db: &'db HashDB, address: &Address) -> Self {
		Self::from_hash(db, address.sha3())
	}

	/// Create a new AcountDB from an address' hash.
	pub fn from_hash(db: &'db HashDB, address_hash: H256) -> Self {
		AccountDB {
			db: db,
			address_hash: address_hash,
		}
	}
}

impl<'db> HashDB for AccountDB<'db>{
	fn keys(&self) -> HashMap<H256, i32> {
		unimplemented!()
	}

	fn get(&self, key: &H256) -> Option<&[u8]> {
		if key == &SHA3_NULL_RLP {
			return Some(&NULL_RLP_STATIC);
		}
		self.db.get(&combine_key(&self.address_hash, key))
	}

	fn contains(&self, key: &H256) -> bool {
		if key == &SHA3_NULL_RLP {
			return true;
		}
		self.db.contains(&combine_key(&self.address_hash, key))
	}

	fn insert(&mut self, _value: &[u8]) -> H256 {
		unimplemented!()
	}

	fn emplace(&mut self, _key: H256, _value: Bytes) {
		unimplemented!()
	}

	fn remove(&mut self, _key: &H256) {
		unimplemented!()
	}

	fn get_aux(&self, hash: &[u8]) -> Option<Vec<u8>> {
		self.db.get_aux(hash)
	}
}

/// DB backend wrapper for Account trie
pub struct AccountDBMut<'db> {
	db: &'db mut HashDB,
	address_hash: H256,
}

impl<'db> AccountDBMut<'db> {
	/// Create a new AccountDB from an address.
	pub fn new(db: &'db mut HashDB, address: &Address) -> Self {
		Self::from_hash(db, address.sha3())
	}

	/// Create a new AcountDB from an address' hash.
	pub fn from_hash(db: &'db mut HashDB, address_hash: H256) -> Self {
		AccountDBMut {
			db: db,
			address_hash: address_hash,
		}
	}

	#[allow(dead_code)]
	pub fn immutable(&'db self) -> AccountDB<'db> {
		AccountDB { db: self.db, address_hash: self.address_hash.clone() }
	}
}

impl<'db> HashDB for AccountDBMut<'db>{
	fn keys(&self) -> HashMap<H256, i32> {
		unimplemented!()
	}

	fn get(&self, key: &H256) -> Option<&[u8]> {
		if key == &SHA3_NULL_RLP {
			return Some(&NULL_RLP_STATIC);
		}
		self.db.get(&combine_key(&self.address_hash, key))
	}

	fn contains(&self, key: &H256) -> bool {
		if key == &SHA3_NULL_RLP {
			return true;
		}
		self.db.contains(&combine_key(&self.address_hash, key))
	}

	fn insert(&mut self, value: &[u8]) -> H256 {
		if value == &NULL_RLP {
			return SHA3_NULL_RLP.clone();
		}
		let k = value.sha3();
		let ak = combine_key(&self.address_hash, &k);
		self.db.emplace(ak, value.to_vec());
		k
	}

	fn emplace(&mut self, key: H256, value: Bytes) {
		if key == SHA3_NULL_RLP {
			return;
		}
		let key = combine_key(&self.address_hash, &key);
		self.db.emplace(key, value.to_vec())
	}

	fn remove(&mut self, key: &H256) {
		if key == &SHA3_NULL_RLP {
			return;
		}
		let key = combine_key(&self.address_hash, key);
		self.db.remove(&key)
	}

	fn insert_aux(&mut self, hash: Vec<u8>, value: Vec<u8>) {
		self.db.insert_aux(hash, value);
	}

	fn get_aux(&self, hash: &[u8]) -> Option<Vec<u8>> {
		self.db.get_aux(hash)
	}

	fn remove_aux(&mut self, hash: &[u8]) {
		self.db.remove_aux(hash);
	}
}


