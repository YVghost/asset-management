package com.assetmanager.identity;

import com.assetmanager.shared.ApiException;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final UserDetailsService users;
  private final PasswordEncoder passwords;
  private final SecurityContextRepository contexts;
  private final AccessService access;
  private final JdbcTemplate db;

  public AuthController(
      UserDetailsService users,
      PasswordEncoder passwords,
      SecurityContextRepository contexts,
      AccessService access,
      JdbcTemplate db) {
    this.users = users;
    this.passwords = passwords;
    this.contexts = contexts;
    this.access = access;
    this.db = db;
  }

  public record Login(@NotBlank @Email String email, @NotBlank @Size(max = 200) String password) {
    @Override
    public String toString() {
      return "Login[credentials=REDACTED]";
    }
  }

  @GetMapping("/csrf")
  public Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @PostMapping("/login")
  public Map<String, Object> login(
      @Valid @RequestBody Login input, HttpServletRequest request, HttpServletResponse response) {
    try {
      var u = users.loadUserByUsername(input.email());
      if (!u.isEnabled() || !passwords.matches(input.password(), u.getPassword()))
        throw new BadCredentialsException("invalid");
      if (request.getSession(false) != null) request.changeSessionId();
      var context = SecurityContextHolder.createEmptyContext();
      context.setAuthentication(
          UsernamePasswordAuthenticationToken.authenticated(u, null, u.getAuthorities()));
      SecurityContextHolder.setContext(context);
      contexts.saveContext(context, request, response);
      request
          .getSession()
          .removeAttribute(
              "org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository.CSRF_TOKEN");
      return me();
    } catch (org.springframework.security.core.AuthenticationException ex) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos");
    }
  }

  @GetMapping("/me")
  public Map<String, Object> me() {
    var user = access.user();
    return Map.of("user", user, "organizations", access.organizations());
  }
}
