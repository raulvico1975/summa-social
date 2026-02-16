# Rollback Plan (auto) — Summa Social

Generat: 2026-02-16 13:06
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 8c5c5a1
SHA main a publicar: 3085dc3

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 3085dc3 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 8c5c5a1
git push origin prod --force-with-lease
```
