# Rollback Plan (auto) — Summa Social

Generat: 2026-03-02 16:36
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 149c298
SHA main a publicar: 5c078d0

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 5c078d0 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 149c298
git push origin prod --force-with-lease
```
