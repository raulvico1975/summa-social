# Rollback Plan (auto) — Summa Social

Generat: 2026-02-28 10:49
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 8a141d9
SHA main a publicar: 14d78c5

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 14d78c5 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 8a141d9
git push origin prod --force-with-lease
```
