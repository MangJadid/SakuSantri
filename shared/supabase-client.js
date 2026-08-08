// Shim pengganti @supabase/supabase-js — API-nya dibuat mirip (createClient, .from().select()...,
// .rpc(), .auth, .storage) supaya seluruh kode di santri/js/*.js dan bendahara/js/*.js yang sudah
// ada TIDAK PERLU diubah. Di baliknya, semua query diterjemahkan jadi fetch() ke api/rest.php dan
// api/rpc.php (PHP + MySQL), bukan lagi ke Supabase/Postgres.
(function () {
  class QueryBuilder {
    constructor(table, apiBase, apiKey) {
      this.table = table;
      this.apiBase = apiBase;
      this.apiKey = apiKey;
      this._action = 'select';
      this._select = null;
      this._filters = [];
      this._order = [];
      this._limit = null;
      this._range = null;
      this._single = false;
      this._maybeSingle = false;
      this._count = null;
      this._head = false;
      this._payload = null;
      this._onConflict = null;
    }

    select(cols = '*', opts = {}) {
      this._select = cols;
      if (opts.count) this._count = opts.count;
      if (opts.head) this._head = true;
      return this;
    }
    insert(payload) { this._action = 'insert'; this._payload = payload; return this; }
    update(payload) { this._action = 'update'; this._payload = payload; return this; }
    upsert(payload, opts = {}) {
      this._action = 'upsert';
      this._payload = payload;
      if (opts.onConflict) this._onConflict = opts.onConflict;
      return this;
    }
    delete() { this._action = 'delete'; return this; }

    _f(col, op, val) { this._filters.push({ col, op, val }); return this; }
    eq(col, val) { return this._f(col, 'eq', val); }
    neq(col, val) { return this._f(col, 'neq', val); }
    gt(col, val) { return this._f(col, 'gt', val); }
    gte(col, val) { return this._f(col, 'gte', val); }
    lt(col, val) { return this._f(col, 'lt', val); }
    lte(col, val) { return this._f(col, 'lte', val); }
    like(col, val) { return this._f(col, 'like', val); }
    ilike(col, val) { return this._f(col, 'ilike', val); }
    in(col, vals) { return this._f(col, 'in', vals); }
    is(col, val) { return this._f(col, 'is', val); }

    order(col, opts = {}) {
      this._order.push({ col, ascending: opts.ascending !== false });
      return this;
    }
    limit(n) { this._limit = n; return this; }
    range(from, to) { this._range = [from, to]; return this; }
    single() { this._single = true; return this; }
    maybeSingle() { this._maybeSingle = true; return this; }

    async _exec() {
      const body = {
        table: this.table, action: this._action,
        filters: this._filters, order: this._order,
        limit: this._limit, range: this._range,
        single: this._single, maybeSingle: this._maybeSingle,
        count: this._count, head: this._head,
      };
      if (this._action === 'select') {
        body.select = this._select || '*';
      } else {
        body.payload = this._payload;
        if (this._onConflict) body.onConflict = this._onConflict;
        if (this._select !== null) body.select = this._select; // hanya minta data balik kalau .select() dipanggil
      }
      try {
        const res = await fetch(this.apiBase + '/rest.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': this.apiKey || '' },
          body: JSON.stringify(body),
        });
        return await res.json();
      } catch (e) {
        return { data: null, error: { message: 'Gagal menghubungi server lokal: ' + e.message } };
      }
    }

    then(onFulfilled, onRejected) { return this._exec().then(onFulfilled, onRejected); }
    catch(onRejected) { return this._exec().catch(onRejected); }
    finally(onFinally) { return this._exec().finally(onFinally); }
  }

  function createClient(url, key) {
    const apiBase = String(url || '').replace(/\/+$/, '');
    return {
      from(table) { return new QueryBuilder(table, apiBase, key); },

      async rpc(fn, params = {}) {
        try {
          const res = await fetch(apiBase + '/rpc.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': key || '' },
            body: JSON.stringify({ fn, params }),
          });
          return await res.json();
        } catch (e) {
          return { data: null, error: { message: 'Gagal menghubungi server lokal: ' + e.message } };
        }
      },

      // Auth Supabase sengaja dinonaktifkan (selalu gagal cepat) — semua login di app ini sudah
      // punya jalur fallback RPC (login_pengurus_check dkk.) yang memang diimplementasikan penuh
      // di PHP, jadi tidak perlu membangun sistem auth/JWT tandingan.
      auth: {
        async signInWithPassword() {
          return { data: { user: null, session: null }, error: { message: 'Auth lokal dinonaktifkan, memakai RPC login.' } };
        },
        async signUp() { return { data: { user: null, session: null }, error: null }; },
        async signOut() { return { error: null }; },
      },

      // Storage tidak dipakai nyata (foto sudah lewat Cloudinary) — stub error yang aman.
      storage: {
        from() {
          return {
            async list() { return { data: null, error: { message: 'Storage tidak dikonfigurasi (foto memakai Cloudinary).' } }; },
          };
        },
      },
    };
  }

  window.supabase = { createClient };
})();
