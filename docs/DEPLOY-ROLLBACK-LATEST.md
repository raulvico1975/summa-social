# Rollback Plan (auto) — Summa Social

Generat: 2026-05-12 22:18
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: fd1a1d939
SHA branca a publicar (main): bc0ed46b8

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert bc0ed46b8 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard fd1a1d939
git push origin prod --force-with-lease
```
