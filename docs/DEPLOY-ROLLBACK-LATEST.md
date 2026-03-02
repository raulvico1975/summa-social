# Rollback Plan (auto) — Summa Social

Generat: 2026-03-02 08:59
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 6173cd7
SHA main a publicar: 5c6059c

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 5c6059c --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 6173cd7
git push origin prod --force-with-lease
```
