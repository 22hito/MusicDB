using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace MusicDB.Api.Filters;

// Замінює повторюваний if (!User.HasClaim("role", "admin")) return Forbid();
public class AdminOnlyAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.HttpContext.User.HasClaim("role", "admin"))
            context.Result = new ForbidResult();
    }
}
