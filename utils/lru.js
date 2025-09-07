class Node {
    constructor(key, value, ttlMs = 0) {
      this.key = key;
      this.value = value;
      this.prev = null;
      this.next = null;
      this.expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
    }
  
    isExpired() {
      return this.expiresAt !== null && Date.now() > this.expiresAt;
    }
  }
  
  class LRU {
    /**
     * Create LRU cache.
     * @param {number} capacity
     * @param {object} [options]
     * @param {number} [options.defaultTTL]
     */
    constructor(capacity = 100, options = {}) {
      if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new Error('capacity must be a positive integer');
      }
      this.capacity = capacity;
      this.map = new Map();
      this.head = null;
      this.tail = null;
      this.defaultTTL = options.defaultTTL || 0;
      this.size = 0;
    }
  
    _moveToHead(node) {
      if (this.head === node) return;
      if (node.prev) node.prev.next = node.next;
      if (node.next) node.next.prev = node.prev;
      if (this.tail === node) this.tail = node.prev;
  
      node.prev = null;
      node.next = this.head;
      if (this.head) this.head.prev = node;
      this.head = node;
      if (!this.tail) this.tail = node;
    }
  
    _removeTail() {
      if (!this.tail) return;
      const node = this.tail;
      if (node.prev) {
        this.tail = node.prev;
        this.tail.next = null;
      } else {
        this.head = this.tail = null;
      }
      this.map.delete(node.key);
      this.size -= 1;
      return node;
    }
  
    _removeNode(node) {
      if (!node) return;
      if (node.prev) node.prev.next = node.next;
      if (node.next) node.next.prev = node.prev;
      if (this.head === node) this.head = node.next;
      if (this.tail === node) this.tail = node.prev;
      this.map.delete(node.key);
      this.size -= 1;
    }
  
    /**
     * Get value for key. Returns undefined if not present or expired.
     * @param {*} key
     */
    get(key) {
      const node = this.map.get(key);
      if (!node) return undefined;
      if (node.isExpired()) {
        this._removeNode(node);
        return undefined;
      }
      this._moveToHead(node);
      return node.value;
    }
  
    /**
     * Put key,value into cache. Optional ttlMs overrides default TTL.
     * @param {*} key
     * @param {*} value
     * @param {number} [ttlMs] time-to-live in ms (0 = no TTL)
     */
    put(key, value, ttlMs) {
      const existing = this.map.get(key);
      const ttl = typeof ttlMs === 'number' ? ttlMs : this.defaultTTL;
      if (existing) {
        existing.value = value;
        existing.expiresAt = ttl > 0 ? Date.now() + ttl : null;
        this._moveToHead(existing);
        return;
      }
  
      const node = new Node(key, value, ttl);
      node.next = this.head;
      if (this.head) this.head.prev = node;
      this.head = node;
      if (!this.tail) this.tail = node;
      this.map.set(key, node);
      this.size += 1;
  
      if (this.size > this.capacity) {
        this._removeTail();
      }
    }
  
    /**
     * Delete key from cache
     * @param {*} key
     * @returns {boolean} whether key existed and was removed
     */
    delete(key) {
      const node = this.map.get(key);
      if (!node) return false;
      this._removeNode(node);
      return true;
    }
  
    /**
     * Clear cache
     */
    clear() {
      this.map.clear();
      this.head = this.tail = null;
      this.size = 0;
    }
  
    keys() {
      const out = [];
      let cur = this.head;
      while (cur) {
        out.push(cur.key);
        cur = cur.next;
      }
      return out;
    }

    stats() {
      return {
        capacity: this.capacity,
        size: this.size,
        keys: this.keys()
      };
    }
  }
  
  module.exports = LRU;
  