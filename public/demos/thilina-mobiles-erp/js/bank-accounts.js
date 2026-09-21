/**
 * Bank subaccounts: children of account code 1100 (parent "Bank") under Assets.
 * Use everywhere we filter accounts for bank transfer / cheque.
 */
const BANK_HEADER_CODE = "1100";

function isBankHeaderAccount(acc) {
  if (!acc) return false;
  if (String(acc.accountCode || "").trim() === BANK_HEADER_CODE) return true;
  const n = (acc.accountName || "").trim().toLowerCase();
  return n === "bank" || n === "banks" || /^bank(\s+|\s*-)account(s)?$/.test(
    (acc.accountName || "").trim()
  );
}

/**
 * @param {Array<{id:number, parentId?:number, accountTypeName?:string, accountName?:string, accountCode?:string}>} accounts
 * @returns {Array}
 */
function filterBankSubAccounts(accounts) {
  const list = Array.isArray(accounts) ? accounts : [];
  const byId = new Map(list.map((a) => [a.id, a]));
  return list.filter((acc) => {
    if ((acc.accountTypeName || "").toLowerCase() !== "assets") return false;
    const p = byId.get(acc.parentId);
    if (!p) return false;
    return isBankHeaderAccount(p);
  });
}

/**
 * @param {Array} accounts
 * @returns {object|undefined} The 1100 Bank (or name-matched) header row, if any
 */
function findBankParentAccount(accounts) {
  const list = Array.isArray(accounts) ? accounts : [];
  return list.find(
    (acc) =>
      (acc.accountTypeName || "").toLowerCase() === "assets" &&
      isBankHeaderAccount(acc)
  );
}

window.filterBankSubAccounts = filterBankSubAccounts;
window.findBankParentAccount = findBankParentAccount;
window.isBankHeaderAccount = isBankHeaderAccount;
