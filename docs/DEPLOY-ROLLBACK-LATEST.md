# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 14:59
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: a5bbf54
SHA main a publicar: 6b80eff

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 6b80eff --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard a5bbf54
git push origin prod --force-with-lease
```
