# Rollback Plan (auto) — Summa Social

Generat: 2026-03-07 18:28
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 213d149
SHA main a publicar: 70cc1cc

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 70cc1cc --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 213d149
git push origin prod --force-with-lease
```
