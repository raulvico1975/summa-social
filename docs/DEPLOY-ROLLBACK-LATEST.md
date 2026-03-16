# Rollback Plan (auto) — Summa Social

Generat: 2026-03-16 09:09
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 6d0b65b
SHA main a publicar: fc8352b

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert fc8352b --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 6d0b65b
git push origin prod --force-with-lease
```
