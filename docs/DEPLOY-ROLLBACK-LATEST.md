# Rollback Plan (auto) — Summa Social

Generat: 2026-02-26 10:18
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: df80f45
SHA main a publicar: 910c6a9

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 910c6a9 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard df80f45
git push origin prod --force-with-lease
```
