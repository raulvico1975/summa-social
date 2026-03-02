# Rollback Plan (auto) — Summa Social

Generat: 2026-03-02 08:52
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 6f629d9
SHA main a publicar: b998f99

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert b998f99 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 6f629d9
git push origin prod --force-with-lease
```
