import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../../core/services/supabase.service';

interface Flyer {
  id: string;
  name: string;
  campaign: string;
  fileName: string;
  image: string;
  description: string;
}

interface CampaignStats {
  campaign: string;
  scans: number;
  downloads_ios: number;
  downloads_android: number;
  downloads: number;
  drop_offs: number;
}

@Component({
  selector: 'app-marketing',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './marketing.component.html',
  styleUrl: './marketing.component.scss'
})
export class MarketingComponent implements OnInit {
  private supabase = inject(SupabaseService);

  flyers: Flyer[] = [
    {
      id: 'flyer-capetown-v1',
      name: 'Cape Town - General',
      campaign: 'flyer-capetown-v1',
      fileName: 'flyer-capetown-v4.html',
      image: 'assets/flyers/meetro_flyer_capetown_v1.jpg',
      description: 'General Cape Town flyer targeting travelers & locals',
    },
    {
      id: 'flyer-v3',
      name: 'Cape Town - Hostels',
      campaign: 'flyer-v3',
      fileName: 'flyer-capetown-hostels.html',
      image: 'assets/flyers/meetro_flyer_v3.jpg',
      description: 'Hostel-specific flyer for solo travelers',
    },
  ];

  statsMap = signal<Record<string, CampaignStats>>({});
  statsLoading = signal(true);

  ngOnInit() {
    this.loadStats();
  }

  async loadStats() {
    this.statsLoading.set(true);
    try {
      const { data, error } = await this.supabase.client.rpc('get_flyer_campaign_stats');

      console.log("DATA", data)
      if (error) throw error;

      const map: Record<string, CampaignStats> = {};
      for (const row of (data || [])) {
        map[row.campaign] = {
          campaign: row.campaign,
          scans: row.scans ?? 0,
          downloads_ios: row.downloads_ios ?? 0,
          downloads_android: row.downloads_android ?? 0,
          downloads: (row.downloads_ios ?? 0) + (row.downloads_android ?? 0),
          drop_offs: (row.scans ?? 0) - ((row.downloads_ios ?? 0) + (row.downloads_android ?? 0)),
        };
      }
      this.statsMap.set(map);
    } catch (err) {
      console.error('Failed to load campaign stats:', err);
    } finally {
      this.statsLoading.set(false);
    }
  }

  getStats(campaign: string): CampaignStats | null {
    return this.statsMap()[campaign] ?? null;
  }

  openPreview(flyer: Flyer) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<!DOCTYPE html>
<html><head><title>${flyer.name}</title>
<style>body{margin:0;background:#1e1e2e;display:flex;justify-content:center;align-items:start;min-height:100vh;}img{max-width:100%;height:auto;}</style>
</head><body><img src="${location.origin}/${flyer.image}" alt="${flyer.name}"></body></html>`);
      win.document.close();
    }
  }

  async openEditor(flyer: Flyer) {
    const html = await this.loadFlyer(flyer);
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html><head>
<title>Edit - ${flyer.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; height: 100vh; font-family: system-ui, sans-serif; }
  .editor-pane { flex: 1; display: flex; flex-direction: column; }
  .preview-pane { flex: 1; border-left: 1px solid #ddd; }
  .toolbar { padding: 8px 16px; background: #1e1e2e; color: #fff; display: flex; align-items: center; justify-content: space-between; }
  .toolbar h3 { font-size: 14px; font-weight: 600; }
  .toolbar button { padding: 6px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; }
  .btn-download { background: #3f51b5; color: #fff; }
  textarea { flex: 1; width: 100%; padding: 16px; font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.5; background: #1e1e1e; color: #d4d4d4; border: none; resize: none; tab-size: 2; outline: none; }
  iframe { width: 100%; height: 100%; border: none; }
</style>
</head><body>
<div class="editor-pane">
  <div class="toolbar">
    <h3>${flyer.name}</h3>
    <button class="btn-download" onclick="downloadFile()">Download HTML</button>
  </div>
  <textarea id="code" spellcheck="false"></textarea>
</div>
<div class="preview-pane">
  <iframe id="preview"></iframe>
</div>
<script>
  var code = document.getElementById('code');
  var preview = document.getElementById('preview');
  code.value = ${JSON.stringify(html)};
  function updatePreview() {
    preview.srcdoc = code.value;
  }
  code.addEventListener('input', updatePreview);
  updatePreview();
  function downloadFile() {
    var blob = new Blob([code.value], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ${JSON.stringify(flyer.fileName)};
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>
</body></html>`);
    win.document.close();
  }

  private async loadFlyer(flyer: Flyer): Promise<string> {
    const response = await fetch(`assets/flyers/${flyer.fileName}`);
    return response.text();
  }
}
