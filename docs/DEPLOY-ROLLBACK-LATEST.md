# Rollback Plan (auto) — Summa Social

Generat: 2026-02-15 21:50
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 42a3f6d
SHA main a publicar: fc9a0e8

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert fc9a0e8 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 42a3f6d
git push origin prod --force-with-lease
```
