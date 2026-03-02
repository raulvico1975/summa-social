# Rollback Plan (auto) — Summa Social

Generat: 2026-03-02 15:46
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: cacdb52
SHA main a publicar: 645fe22

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 645fe22 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard cacdb52
git push origin prod --force-with-lease
```
