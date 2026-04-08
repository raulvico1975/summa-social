# Rollback Plan (auto) — Summa Social

Generat: 2026-04-08 17:52
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 4f797cd7
SHA branca a publicar (codex/fix-expense-unassign-trash-prod-only): 563a5048

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout codex/fix-expense-unassign-trash-prod-only
git revert 563a5048 --no-edit
git push origin codex/fix-expense-unassign-trash-prod-only
bash scripts/deploy.sh codex/fix-expense-unassign-trash-prod-only
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 4f797cd7
git push origin prod --force-with-lease
```
