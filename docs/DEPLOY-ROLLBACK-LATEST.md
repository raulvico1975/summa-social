# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 15:45
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 34f5703
SHA main a publicar: b0039f2

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert b0039f2 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 34f5703
git push origin prod --force-with-lease
```
