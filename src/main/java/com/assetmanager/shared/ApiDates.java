package com.assetmanager.shared;

import java.util.*;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.*;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Keep SQL DATE values as calendar dates instead of serializing them as timezone-dependent
 * timestamps.
 */
@RestControllerAdvice(basePackages = "com.assetmanager")
public class ApiDates implements ResponseBodyAdvice<Object> {
  @Override
  public boolean supports(
      MethodParameter parameter, Class<? extends HttpMessageConverter<?>> converter) {
    return true;
  }

  @Override
  public Object beforeBodyWrite(
      Object body,
      MethodParameter parameter,
      MediaType mediaType,
      Class<? extends HttpMessageConverter<?>> converter,
      ServerHttpRequest request,
      ServerHttpResponse response) {
    return normalize(body);
  }

  private Object normalize(Object value) {
    if (value instanceof java.sql.Timestamp timestamp) return timestamp.toInstant();
    if (value instanceof java.sql.Date date) return date.toLocalDate();
    if (value instanceof Map<?, ?> map) {
      var result = new LinkedHashMap<Object, Object>();
      map.forEach((k, v) -> result.put(k, normalize(v)));
      return result;
    }
    if (value instanceof List<?> list) return list.stream().map(this::normalize).toList();
    return value;
  }
}
