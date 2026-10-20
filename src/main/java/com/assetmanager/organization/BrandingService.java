package com.assetmanager.organization;

import com.assetmanager.identity.AccessService;
import com.assetmanager.shared.*;
import jakarta.validation.constraints.*;
import java.io.*;
import java.util.*;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class BrandingService {
  private final JdbcTemplate db;
  private final AccessService access;
  private final JsonSupport json;

  public BrandingService(JdbcTemplate db, AccessService access, JsonSupport json) {
    this.db = db;
    this.access = access;
    this.json = json;
  }

  public record Input(
      @NotBlank @Pattern(regexp = "GENERIC|EDINUN|CUSTOM") String themeKey,
      @Pattern(regexp = "#[0-9a-fA-F]{6}") String primary,
      @Pattern(regexp = "#[0-9a-fA-F]{6}") String sidebar,
      @Pattern(regexp = "#[0-9a-fA-F]{6}") String background,
      @Pattern(regexp = "SYSTEM|ARIAL|GEORGIA") String font) {}

  private void authorize(UUID org, boolean system) {
    if (system) access.master();
    else access.role(org);
  }

  public Map<String, Object> get(UUID org, boolean system) {
    authorize(org, system);
    var rows =
        db.queryForList(
            "select id,name,theme_key,branding_version,brand_config::text,(logo_data is not null)"
                + " has_logo from organizations where id=?",
            org);
    if (rows.isEmpty()) throw ApiException.missing();
    var row = rows.getFirst();
    row.put("config", json.read((String) row.remove("brand_config")));
    return row;
  }

  @Transactional
  public Map<String, Object> save(UUID org, Input in) {
    access.master();
    get(org, true);
    Map<String, Object> config = new LinkedHashMap<>();
    if ("CUSTOM".equals(in.themeKey())) {
      if (in.primary() == null
          || in.sidebar() == null
          || in.background() == null
          || in.font() == null)
        throw ApiException.invalid("Completa los colores y la fuente del tema personalizado");
      if (contrast(in.primary(), "#FFFFFF") < 4.5
          || contrast(in.sidebar(), "#FFFFFF") < 4.5
          || contrast(in.background(), "#172B3A") < 4.5)
        throw ApiException.invalid(
            "Los colores deben mantener contraste de al menos 4.5:1: blanco sobre botones y menú,"
                + " texto oscuro sobre el fondo");
      config.put("primary", in.primary());
      config.put("sidebar", in.sidebar());
      config.put("background", in.background());
      config.put("font", in.font());
    }
    db.update(
        "update organizations set"
            + " theme_key=?,brand_config=?::jsonb,branding_version=branding_version+1 where id=?",
        in.themeKey(),
        json.write(config),
        org);
    return get(org, true);
  }

  public static double contrast(String a, String b) {
    double x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  }

  private static double luminance(String hex) {
    double sum = 0;
    double[] weights = {.2126, .7152, .0722};
    for (int i = 0; i < 3; i++) {
      double c = Integer.parseInt(hex.substring(1 + i * 2, 3 + i * 2), 16) / 255d;
      sum += weights[i] * (c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4));
    }
    return sum;
  }

  @Transactional
  public void logo(UUID org, MultipartFile file) throws IOException {
    access.master();
    get(org, true);
    if (file.isEmpty() || file.getSize() > 1024 * 1024)
      throw ApiException.invalid("El logo debe ser PNG o JPEG de hasta 1 MB");
    byte[] encoded;
    try (var input = new MemoryCacheImageInputStream(file.getInputStream())) {
      var readers = ImageIO.getImageReaders(input);
      if (!readers.hasNext())
        throw ApiException.invalid("Formato de imagen no reconocido; utiliza PNG o JPEG");
      var reader = readers.next();
      try {
        reader.setInput(input);
        if (reader.getWidth(0) > 2048 || reader.getHeight(0) > 2048)
          throw ApiException.invalid("El logo debe medir como máximo 2048 × 2048 píxeles");
        var image = reader.read(0);
        var out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        encoded = out.toByteArray();
        if (encoded.length > 2 * 1024 * 1024)
          throw ApiException.invalid("La imagen procesada es demasiado grande");
      } finally {
        reader.dispose();
      }
    }
    db.update(
        "update organizations set logo_data=?,branding_version=branding_version+1 where id=?",
        encoded,
        org);
  }

  public byte[] logo(UUID org) {
    access.role(org);
    var rows = db.queryForList("select logo_data from organizations where id=?", org);
    if (rows.isEmpty() || rows.getFirst().get("logo_data") == null) throw ApiException.missing();
    return (byte[]) rows.getFirst().get("logo_data");
  }

  @Transactional
  public void clearLogo(UUID org) {
    access.master();
    get(org, true);
    db.update(
        "update organizations set logo_data=null,branding_version=branding_version+1 where id=?",
        org);
  }
}
