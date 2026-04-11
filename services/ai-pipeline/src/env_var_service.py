# env_var_service.py
# Resolves {{env.VAR_NAME}} tokens in agent config text fields at conversation start.
# Called from: system_prompt resolution, first_message resolution,
#              tool webhook URL/header resolution, MCP server_url resolution.

import re
import asyncpg
from typing import Optional

ENV_VAR_PATTERN = re.compile(r'\{\{env\.([A-Za-z][A-Za-z0-9_]*)\}\}')


async def resolve_env_vars(
    text: str,
    tenant_id: str,
    environment: str,   # 'production' | 'staging' | 'development' | custom
    db_pool: asyncpg.Pool
) -> str:
    """
    Replace all {{env.VAR_NAME}} tokens in text with their resolved values.
    Falls back to production value if no override exists for the current environment.
    Raises ValueError if a referenced variable has no production value.
    """
    tokens = ENV_VAR_PATTERN.findall(text)
    if not tokens:
        return text

    async with db_pool.acquire() as conn:
        for var_name in set(tokens):  # deduplicate
            # Look up variable
            var = await conn.fetchrow(
                "SELECT var_id FROM environment_variables "
                "WHERE tenant_id = $1 AND name = $2",
                tenant_id, var_name
            )
            if not var:
                raise ValueError(f"Environment variable '{var_name}' not found for tenant {tenant_id}")

            # Try current environment first, fall back to production
            value_row = await conn.fetchrow(
                "SELECT value FROM environment_variable_values "
                "WHERE var_id = $1 AND environment = $2",
                var['var_id'], environment
            )
            if not value_row:
                value_row = await conn.fetchrow(
                    "SELECT value FROM environment_variable_values "
                    "WHERE var_id = $1 AND environment = 'production'",
                    var['var_id']
                )
            if not value_row:
                raise ValueError(
                    f"Variable '{var_name}' has no value for environment "
                    f"'{environment}' and no production fallback."
                )

            text = text.replace(f'{{{{env.{var_name}}}}}', value_row['value'])

    return text
