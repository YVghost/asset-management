package com.assetmanager;

import static org.junit.jupiter.api.Assertions.*;

import com.assetmanager.identity.AuthController;
import com.assetmanager.organization.OrganizationController;
import org.junit.jupiter.api.Test;

class AssetManagementApplicationTests {

  @Test
  void credentialObjectsDoNotExposePasswordsInLogs() {
    String password = "sensitive-test-password";
    assertFalse(
        new AuthController.Login("test@example.com", password).toString().contains(password));
    assertFalse(
        new OrganizationController.UserInput("test@example.com", "Test", password, "VIEWER")
            .toString()
            .contains(password));
  }
}
