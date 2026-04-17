# Discord Bot + Socket.IO Hosting with Public Domain and Cloudflare

This guide explains how to host a Discord bot with a Socket.IO backend on a VPS and make it accessible via a **public domain** using **Cloudflare** and **Nginx reverse proxy** with SSL/TLS (HTTPS & WSS).  

---

## Prerequisites

1. VPS with backend bot + Socket.IO running, e.g.:

```

SERVER RUNNING: 161.97.145.106:2555
MAIN DOMAIN: example.com

````

2. Registered domain (example: `example.com`).  
3. Cloudflare account for domain management.  
4. Nginx installed on VPS.  
5. Certbot installed for SSL/TLS.  

---

## 1️⃣ Configure DNS in Cloudflare

1. Log in to Cloudflare → select your domain (`example.com`).  
2. Add an **A record**:

| Type | Name     | Content         | Proxy status           |
|------|----------|-----------------|------------------------|
| A    | example  | 161.97.145.106  | Proxied (orange cloud) |

> ⚠️ Notes:  
> - If WebSocket (`wss://`) does not work through Cloudflare proxy, you can switch to **DNS only (grey cloud)**.  
> - TTL can remain default or auto.  

---

## 2️⃣ Nginx Reverse Proxy + SSL + WebSocket

Create a new Nginx site configuration:

```bash
cd /etc/nginx/sites-available
sudo nano api-example.conf
````

Paste the following:

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name example.com;

    return 301 https://$host$request_uri;
}

# main server HTTPS
server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL certificate (letsencrypt)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # reverse proxy ke backend socket.io
    location / {
        proxy_pass http://161.97.145.106:2555;
        proxy_http_version 1.1;

        # websocket upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # standard headers
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # timeout panjang untuk websocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;

        # bypass cache untuk upgrade
        proxy_cache_bypass $http_upgrade;

        # optional: rate limiting
        # limit_req zone=one burst=5 nodelay;
    }
}
```

---

## 3️⃣ Enable Site and Restart Nginx

```bash
sudo ln -s /etc/nginx/sites-available/api-example.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d "example.com"
nginx -t
sudo systemctl restart nginx
```

---

> Certbot will automatically configure SSL for Nginx and enable HTTPS.

---

## 4️⃣ Open Firewall

```bash
sudo ufw allow 80,443/tcp
sudo ufw reload
```

> ⚠️ Do not expose the backend port (2555) to the public. Nginx acts as the reverse proxy.

---

## 5️⃣ Cloudflare & WebSocket Notes

* Orange cloud (Proxied) usually works with WebSocket.
* If WebSocket fails, switch DNS to **DNS only (grey cloud)**.
* SSL/TLS mode in Cloudflare should be **Full**.

---

## 6️⃣ Removing Nginx Configuration (Optional)

```bash
cd /etc/nginx/sites-available
sudo rm /etc/nginx/sites-available/api-example.conf
sudo rm /etc/nginx/sites-enabled/api-example.conf
sudo systemctl restart nginx
```

---

## ✅ Result

Your Discord bot + Socket.IO backend is now accessible via:

```
https://example.com
wss://example.com/socket.io
```

* WebSocket client connects securely via WSS.
* Discord OAuth callback works via HTTPS.
* VPS IP remains private; all traffic goes through domain + Nginx + Cloudflare.

---