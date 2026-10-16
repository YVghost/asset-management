package com.assetmanager.identity;

import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;

@Configuration
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  SecurityContextRepository contextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  UserDetailsService users(JdbcTemplate db) {
    return email -> {
      var rows =
          db.queryForList(
              "select email,password_hash,active from app_users where email=?",
              email.toLowerCase().trim());
      if (rows.isEmpty()) throw new UsernameNotFoundException("Credenciales incorrectas");
      var row = rows.getFirst();
      return User.withUsername((String) row.get("email"))
          .password((String) row.get("password_hash"))
          .disabled(!Boolean.TRUE.equals(row.get("active")))
          .roles("USER")
          .build();
    };
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http, SecurityContextRepository repository)
      throws Exception {
    var csrf = new HttpSessionCsrfTokenRepository();
    var handler = new CsrfTokenRequestAttributeHandler();
    return http.securityContext(c -> c.securityContextRepository(repository))
        .csrf(c -> c.csrfTokenRepository(csrf).csrfTokenRequestHandler(handler))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/api/v1/auth/csrf",
                        "/api/v1/auth/login",
                        "/actuator/health",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/v3/api-docs/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (req, res, ex) -> {
                          res.setStatus(401);
                          res.setContentType("application/json");
                          res.getWriter().write("{\"message\":\"Inicia sesión\"}");
                        })
                    .accessDeniedHandler(
                        (req, res, ex) -> {
                          res.setStatus(403);
                          res.setContentType("application/json");
                          res.getWriter()
                              .write("{\"message\":\"Acceso denegado o token CSRF inválido\"}");
                        }))
        .logout(
            l ->
                l.logoutUrl("/api/v1/auth/logout")
                    .invalidateHttpSession(true)
                    .deleteCookies("JSESSIONID")
                    .logoutSuccessHandler((req, res, a) -> res.setStatus(204)))
        .build();
  }
}
