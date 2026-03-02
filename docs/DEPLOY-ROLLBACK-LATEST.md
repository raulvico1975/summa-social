# Rollback Plan (auto) — Summa Social

Generat: 2026-03-02 16:42
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 4b3105c
SHA main a publicar: 182468a

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 182468a --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 4b3105c
git push origin prod --force-with-lease
```
